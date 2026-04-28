import Swal from 'sweetalert2';

const confirmGreen = '#059669';
const neutral = '#64748b';

/** Full modal — errors */
export function popupError(message, title = 'Something went wrong') {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: confirmGreen,
  });
}

/** Full modal — success */
export function popupSuccess(message, title = 'Success') {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: confirmGreen,
  });
}

/** Full modal — info / HTML body (e.g. reset link) */
export function popupInfo(title, html) {
  return Swal.fire({
    icon: 'info',
    title,
    html,
    confirmButtonColor: confirmGreen,
  });
}

/** Confirm dialog */
export function popupConfirm(title, text, confirmText = 'Yes') {
  return Swal.fire({
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: confirmGreen,
    cancelButtonColor: neutral,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
  });
}
