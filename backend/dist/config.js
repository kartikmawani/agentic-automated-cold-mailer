export const config = {
    GroqAPIKey: process.env.GROQ_API_KEY,
    resendAPIKey: process.env.RESEND_API_KEY,
    workSpacePath: "will be set in the future"
};
export function validateEnviornmentVariables() {
    if (!config.GroqAPIKey) {
        throw new Error("GROQ_API_KEY is not set");
    }
    if (!config.resendAPIKey) {
        throw new Error("RESEND_API_KEY is not set");
    }
}
