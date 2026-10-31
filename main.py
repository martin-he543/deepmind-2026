from google import genai

client = genai.Client()  # reads GEMINI_API_KEY from the environment

resp = client.models.generate_content(
    model="gemini-4-argon",  # replace with the exact name from step 3
    contents="Explain what an endogenous retrovirus LTR is in two sentences.",
)
print(resp.text)
