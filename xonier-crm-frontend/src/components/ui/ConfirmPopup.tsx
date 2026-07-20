import Swal from "sweetalert2";

interface ConfirmPopupInterface {
  title: string;
  text?: string;
  btnTxt?: string;
  cancelTxt?: string;
}

const ConfirmPopup = async ({
  title,
  text,
  btnTxt = "Yes, Continue",
  cancelTxt = "Cancel",
}: ConfirmPopupInterface): Promise<boolean> => {
  const isDark = document.documentElement.classList.contains("dark");

  // Add blur style to backdrop
  const styleElement = document.createElement('style');
  styleElement.innerHTML = `
    .swal2-container.swal2-backdrop-show {
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      background-color: ${isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'} !important;
      transition: all 0.3s ease !important;
    }
    
    .swal2-popup {
      box-shadow: 0 25px 50px -12px ${isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.25)'} !important;
    }
  `;
  document.head.appendChild(styleElement);

  const result = await Swal.fire({
    title,
    text,
    icon: "warning",

    showCancelButton: true,

    confirmButtonText: btnTxt,
    cancelButtonText: cancelTxt,

    reverseButtons: true,
    focusCancel: true,

    // Allow closing by clicking outside
    allowOutsideClick: true,
    allowEscapeKey: true,

    background: isDark ? "#1e293b" : "#ffffff",
    color: isDark ? "#f8fafc" : "#1f2937",

    buttonsStyling: false,

    showClass: {
      popup: "animate__animated animate__zoomIn animate__faster",
      backdrop: "animate__animated animate__fadeIn animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__zoomOut animate__faster",
      backdrop: "animate__animated animate__fadeOut animate__faster",
    },

    customClass: {
      popup: `
        rounded-2xl p-6 border shadow-2xl
        ${isDark
          ? "bg-slate-800 border-slate-700"
          : "bg-white border-slate-200"}
      `,
      title: "text-2xl font-bold mb-2",
      htmlContainer: `mt-2 ${
        isDark ? "text-slate-300 text-base" : "text-slate-600 text-base"
      }`,
      confirmButton:
        "px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl",
      cancelButton:
        "px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-all duration-200 cursor-pointer mr-3 shadow-lg hover:shadow-xl",
      actions: "gap-3 mt-6",
    },

    didOpen: () => {
      // Apply blur to backdrop
      const container = document.querySelector('.swal2-container') as HTMLElement;
      if (container) {
        container.style.backdropFilter = 'blur(10px)';
        container.style.webkitBackdropFilter = 'blur(10px)';
      }
    },

    willClose: () => {
      // Remove style element when popup closes
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    },
  });

  return result.isConfirmed;
};

export default ConfirmPopup;