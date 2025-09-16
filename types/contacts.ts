export type Contact = {
  firstName?: string;
  lastName?: string;
  title?: string;
  accountName?: string;
  email: string;
  mailingCity?: string;
  mailingStreet?: string;
  mailingZip?: string;
  businessPhone?: string;
  mobileNumber?: string;
};

export type EmailType = "Direct" | "Consultative" | "Friendly";
