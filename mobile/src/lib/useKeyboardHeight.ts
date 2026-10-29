import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Высота экранной клавиатуры в пикселях (0, когда клавиатура закрыта).
 *
 * В отличие от `KeyboardAvoidingView`, работает и внутри нативного `Modal`
 * на Android: там окно не ресайзится по `adjustResize`, поэтому отступ нужно
 * добавлять вручную.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return height;
}
