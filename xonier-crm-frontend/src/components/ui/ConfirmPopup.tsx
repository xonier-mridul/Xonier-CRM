import Swal from "sweetalert2";


 const ConfirmPopup = async ({
  title,
  text,
  btnTxt,
  cancelTxt,
}: ConfirmPopupInterface): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonText: cancelTxt ? cancelTxt : "No",
    cancelButtonColor: "#d33",
    confirmButtonText: btnTxt ? btnTxt : "Yes",
  });

  return result.isConfirmed;
};

export default ConfirmPopup
