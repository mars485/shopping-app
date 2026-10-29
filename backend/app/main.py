import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, ForeignKey, Numeric, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./shopping.db')
SECRET_KEY = os.getenv('SECRET_KEY', '')
if not SECRET_KEY:
    if os.getenv('APP_ENV') == 'production':
        raise RuntimeError('SECRET_KEY is required in production')
    SECRET_KEY = secrets.token_urlsafe(32)
engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

class ShoppingList(Base):
    __tablename__ = 'shopping_lists'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    owner_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    items: Mapped[list['Item']] = relationship(cascade='all, delete-orphan', lazy='selectin')

class Membership(Base):
    __tablename__ = 'memberships'
    list_id: Mapped[str] = mapped_column(ForeignKey('shopping_lists.id', ondelete='CASCADE'), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), primary_key=True)

class Item(Base):
    __tablename__ = 'items'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    list_id: Mapped[str] = mapped_column(ForeignKey('shopping_lists.id'), index=True)
    name: Mapped[str] = mapped_column(String(120))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=1)
    unit: Mapped[str] = mapped_column(String(20), default='шт')
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    checked: Mapped[bool] = mapped_column(Boolean, default=False)

Base.metadata.create_all(engine)
app = FastAPI(title='Shopping API', version='0.2.0')

class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)

class ListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)

class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    quantity: Decimal = Field(default=Decimal('1'), gt=0, max_digits=12, decimal_places=3)
    unit: str = Field(default='шт', min_length=1, max_length=20)
    price: Decimal = Field(default=Decimal('0'), ge=0, max_digits=12, decimal_places=2)

class ItemPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    quantity: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=3)
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    checked: bool | None = None

class ShareRequest(BaseModel):
    email: str

def db_session():
    with SessionLocal() as db:
        yield db

def password_hash(password: str):
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 300_000)
    return f'{salt.hex()}:{key.hex()}'

def verify_password(password: str, stored: str):
    try:
        salt, expected = stored.split(':', 1)
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 300_000)
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (ValueError, TypeError):
        return False

def token(user: User):
    return {'access_token': jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + timedelta(days=7)}, SECRET_KEY, algorithm='HS256'), 'token_type': 'bearer'}

def current_user(authorization: str | None = Header(default=None), db: Session = Depends(db_session)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Authentication required')
    try:
        payload = jwt.decode(authorization[7:], SECRET_KEY, algorithms=['HS256'])
        user = db.get(User, payload['sub'])
        if user:
            return user
    except (jwt.PyJWTError, KeyError):
        pass
    raise HTTPException(401, 'Invalid token')

def require_list(list_id: str, user: User, db: Session, owner_only: bool = False):
    record = db.get(ShoppingList, list_id)
    if not record:
        raise HTTPException(404, 'List not found')
    if record.owner_id != user.id and (owner_only or not db.get(Membership, (list_id, user.id))):
        raise HTTPException(403, 'Access denied')
    return record

def serialize_item(i: Item):
    return {'id': i.id, 'name': i.name, 'quantity': float(i.quantity), 'unit': i.unit, 'price': float(i.price), 'checked': i.checked}

def serialize_list(record: ShoppingList):
    return {'id': record.id, 'name': record.name, 'owner_id': record.owner_id, 'items': [serialize_item(i) for i in record.items]}

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/auth/register', status_code=201)
def register(data: Credentials, db: Session = Depends(db_session)):
    email = data.email.strip().lower()
    if '@' not in email or db.scalar(select(User).where(User.email == email)):
        raise HTTPException(400, 'Invalid or registered email')
    user = User(email=email, password_hash=password_hash(data.password))
    db.add(user)
    db.commit()
    return token(user)

@app.post('/auth/login')
def login(data: Credentials, db: Session = Depends(db_session)):
    user = db.scalar(select(User).where(User.email == data.email.strip().lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, 'Invalid credentials')
    return token(user)

@app.get('/lists')
def get_lists(user: User = Depends(current_user), db: Session = Depends(db_session)):
    records = db.scalars(select(ShoppingList).where((ShoppingList.owner_id == user.id) | (ShoppingList.id.in_(select(Membership.list_id).where(Membership.user_id == user.id))))).all()
    return [serialize_list(record) for record in records]

@app.post('/lists', status_code=201)
def create_list(data: ListCreate, user: User = Depends(current_user), db: Session = Depends(db_session)):
    record = ShoppingList(name=data.name, owner_id=user.id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_list(record)

@app.delete('/lists/{list_id}', status_code=204)
def delete_list(list_id: str, user: User = Depends(current_user), db: Session = Depends(db_session)):
    record = require_list(list_id, user, db, owner_only=True)
    db.query(Membership).filter_by(list_id=list_id).delete()
    db.delete(record)
    db.commit()

@app.post('/lists/{list_id}/share')
def share_list(list_id: str, data: ShareRequest, user: User = Depends(current_user), db: Session = Depends(db_session)):
    require_list(list_id, user, db, owner_only=True)
    target = db.scalar(select(User).where(User.email == data.email.strip().lower()))
    if not target:
        raise HTTPException(404, 'User must register first')
    if target.id != user.id and not db.get(Membership, (list_id, target.id)):
        db.add(Membership(list_id=list_id, user_id=target.id))
        db.commit()
    return {'shared': True}

@app.post('/lists/{list_id}/items', status_code=201)
def add_item(list_id: str, data: ItemCreate, user: User = Depends(current_user), db: Session = Depends(db_session)):
    require_list(list_id, user, db)
    item = Item(list_id=list_id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_item(item)

@app.patch('/lists/{list_id}/items/{item_id}')
def update_item(list_id: str, item_id: str, data: ItemPatch, user: User = Depends(current_user), db: Session = Depends(db_session)):
    require_list(list_id, user, db)
    item = db.get(Item, item_id)
    if not item or item.list_id != list_id:
        raise HTTPException(404, 'Item not found')
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return serialize_item(item)

@app.patch('/lists/{list_id}/items/{item_id}/toggle')
def toggle_item(list_id: str, item_id: str, user: User = Depends(current_user), db: Session = Depends(db_session)):
    require_list(list_id, user, db)
    item = db.get(Item, item_id)
    if not item or item.list_id != list_id:
        raise HTTPException(404, 'Item not found')
    item.checked = not item.checked
    db.commit()
    db.refresh(item)
    return serialize_item(item)

@app.delete('/lists/{list_id}/items/{item_id}', status_code=204)
def delete_item(list_id: str, item_id: str, user: User = Depends(current_user), db: Session = Depends(db_session)):
    require_list(list_id, user, db)
    item = db.get(Item, item_id)
    if not item or item.list_id != list_id:
        raise HTTPException(404, 'Item not found')
    db.delete(item)
    db.commit()

@app.get('/lists/{list_id}/total')
def get_total(list_id: str, user: User = Depends(current_user), db: Session = Depends(db_session)):
    record = require_list(list_id, user, db)
    return {'total': float(sum((i.price * i.quantity for i in record.items), Decimal('0')))}
