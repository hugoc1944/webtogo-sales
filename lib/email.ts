import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendBookingConfirmation(to: string, company: string) {
  await resend.emails.send({
    from: "WebtoGO <noreply@webtogo.pt>",
    to,
    subject: "Confirmação de agendamento",
    html: `<p>Olá, ${company}! Obrigado pelo agendamento. Falamos em breve.</p>`
  });
}
