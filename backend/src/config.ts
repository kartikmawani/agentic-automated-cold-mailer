import "dotenv" from "dotenv";
dotenv.config();
export const config = {
    AnthropicAPIKey: process.env.ANTHROPIC_API_KEY,
    resendAPIKey: process.env.RESEND_API_KEY,
    workSpacePath:"will be set in the future"
}
function validateEnviornmentVariables(){
    if(!config.AnthropicAPIKey){
        throw new Error("ANTHROPIC_API_KEY is not set");
    }
    if(!config.resendAPIKey){
        throw new Error("RESEND_API_KEY is not set");
    }
}