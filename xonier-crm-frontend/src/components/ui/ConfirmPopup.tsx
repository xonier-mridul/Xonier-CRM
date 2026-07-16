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

  const result = await Swal.fire({
    title,
    text,
    icon: "warning",

    showCancelButton: true,

    confirmButtonText: btnTxt,
    cancelButtonText: cancelTxt,

    reverseButtons: true,
    focusCancel: true,

    background: isDark ? "#222A3D" : "#ffffff",
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
        rounded-3xl p-4 border
        ${isDark
          ? "bg-slate-900 border-slate-700 shadow-slate-950/50"
          : "bg-white border-slate-200 shadow-2xl"}
      `,
      title: "text-2xl font-bold",
      htmlContainer: isDark
        ? "text-slate-400 text-base"
        : "text-slate-500 text-base",
      confirmButton:
        "px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all cursor-pointer",
      cancelButton:
        "px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all cursor-pointer mr-3",
      actions: "gap-3",
    },
  });

  return result.isConfirmed;
};

export default ConfirmPopup;