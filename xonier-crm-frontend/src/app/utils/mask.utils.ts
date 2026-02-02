export const maskEmail = (email: string) => {
  if (!email) return "";
  const [_, domain] = email.split("@");
  return `********@${domain}`;
};

export const maskPhone = (phone: string) => {
  if (!phone) return "";
  const last4 = phone.slice(-4);
  return `************${last4}`;
};
