import uvicorn
import os
import io
import json
import re
import tempfile
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional, Literal
from groq import Groq
from pydub import AudioSegment
import pypdf

load_dotenv()

AI_SERVICE_PORT    = int(os.getenv("AI_SERVICE_PORT", 8000))
GROQ_API_KEY       = os.getenv("GROQ_API_KEY")
GROQ_MODEL_NAME    = os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile")
GROQ_WHISPER_MODEL = "whisper-large-v3-turbo"
GROQ_TTS_MODEL     = "canopylabs/orpheus-v1-english"   # human-like voice
GROQ_TTS_VOICE     = os.getenv("GROQ_TTS_VOICE", "jessica")  # options: tara, leah, jessica, leo, dan, mia, zac, zoe

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is not set in .env file")

groq_client = Groq(api_key=GROQ_API_KEY)
print(f" Groq Client Initialized | LLM: {GROQ_MODEL_NAME} | STT: {GROQ_WHISPER_MODEL}")

app = FastAPI(title="AI Interviewer Microservice", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────── Pydantic Models ────────────────────────────────

class QuestionRequest(BaseModel):
    role: str = "MERN Stack Developer"
    level: str = "Junior"
    count: int = 5
    interview_type: str = "coding-mix"
    resume_summary: Optional[str] = None


class QuestionResponse(BaseModel):
    questions: list[str]
    model_used: str


class ResumeParseResponse(BaseModel):
    name: Optional[str]
    skills: list[str]
    experience: list[str]
    projects: list[str]
    education: list[str]
    summary: str


class RealtimeFollowupRequest(BaseModel):
    resume_summary: str
    role: str
    level: str
    question_history: list[dict]        # [{question, answer}, ...]
    last_answer: str
    last_question: str
    question_type: str                  # "oral" | "coding"
    user_code: Optional[str] = None


class RealtimeFollowupResponse(BaseModel):
    action: str                         # "followup" | "next" | "end"
    next_question: Optional[str] = None
    instruction: Optional[str] = None  # e.g. "Explain that in more depth"
    reason: str


class EvaluationRequest(BaseModel):
    question: str
    question_type: str
    role: str
    level: str
    user_answer: Optional[str] = None
    user_code: Optional[str] = None
    resume_summary: Optional[str] = None


class EvaluationResponse(BaseModel):
    technicalScore: int
    confidenceScore: int
    englishScore: int
    clarityScore: int
    aiFeedback: str
    idealAnswer: str
    suggestions: list[str]
    englishFeedback: str


class SessionReportRequest(BaseModel):
    evaluations: list[EvaluationResponse]
    role: str = "Developer"
    level: str = "Junior"


class FullInterviewReport(BaseModel):
    overallScore: int
    technicalAvg: int
    confidenceAvg: int
    englishAvg: int
    clarityAvg: int
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    hiringRecommendation: str           # "Strong Yes" | "Yes" | "Maybe" | "No"
    detailedFeedback: str


# ─────────────────────────── Helpers ────────────────────────────────────────

def _chat(system: str, user: str, temperature: float = 0.5,
          json_mode: bool = False) -> str:
    kwargs: dict = dict(
        model=GROQ_MODEL_NAME,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        temperature=temperature,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = groq_client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content.strip()


def _safe_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        fixed = re.sub(r'[\r\n\t]', ' ', text)
        try:
            return json.loads(fixed)
        except Exception:
            return {}


# ─────────────────────────── Routes ─────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "AI Interviewer Microservice v3.0",
        "llm_model": GROQ_MODEL_NAME,
        "stt_model": GROQ_WHISPER_MODEL,
        "tts_model": GROQ_TTS_MODEL,
        "tts_voice": GROQ_TTS_VOICE,
        "features": [
            "resume-aware questions",
            "real-time follow-ups",
            "english & confidence scoring",
            "full session report",
            "AI interviewer voice (TTS)",
        ],
    }


# ── 1. Parse Resume ──────────────────────────────────────────────────────────

@app.post("/parse-resume", response_model=ResumeParseResponse)
async def parse_resume(file: UploadFile = File(...)):
    """
    Accept a PDF resume → extract text → Groq structures it.
    Returns a compact summary string ready to inject into other prompts.
    """
    try:
        pdf_bytes = await file.read()
        reader    = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        raw_text  = "\n".join(page.extract_text() or "" for page in reader.pages)

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

        system = (
            "You are an expert resume parser. "
            "Extract structured information from the resume text below. "
            "Respond ONLY with a JSON object with these exact keys: "
            "'name' (string or null), "
            "'skills' (array of strings), "
            "'experience' (array of strings – one item per role/company, max 20 words each), "
            "'projects' (array of strings – project name + one-line description, max 20 words each), "
            "'education' (array of strings, max 15 words each). "
            "Keep items concise."
        )

        raw  = _chat(system, raw_text, temperature=0.1, json_mode=True)
        data = _safe_json(raw)

        skills     = data.get("skills",     [])
        experience = data.get("experience", [])
        projects   = data.get("projects",   [])
        education  = data.get("education",  [])
        name       = data.get("name")

        summary = (
            f"Candidate: {name or 'Unknown'}. "
            f"Skills: {', '.join(skills[:15])}. "
            f"Experience: {'; '.join(experience[:5])}. "
            f"Projects: {'; '.join(projects[:5])}. "
            f"Education: {'; '.join(education[:3])}."
        )

        return ResumeParseResponse(
            name=name,
            skills=skills,
            experience=experience,
            projects=projects,
            education=education,
            summary=summary,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Generate Questions (resume-aware) ─────────────────────────────────────

@app.post("/generate-questions", response_model=QuestionResponse)
async def generate_questions(request: QuestionRequest):
    """
    If resume_summary is supplied, at least half the questions are tailored
    to the candidate's own skills, projects, and experience.
    """
    try:
        if request.interview_type == "coding-mix":
            coding_count = max(1, int(request.count * 0.2))
            oral_count   = request.count - coding_count
            instruction  = (
                f"The first {coding_count} questions MUST be coding challenges "
                f"requiring function implementation. "
                f"The remaining {oral_count} questions MUST be conceptual oral questions."
            )
        else:
            instruction = (
                "All questions MUST be conceptual oral questions. "
                "Do NOT generate any coding or implementation challenges."
            )

        resume_context = ""
        if request.resume_summary:
            resume_context = (
                f"\nCandidate resume context: {request.resume_summary}\n"
                "Tailor at least half the questions to the candidate's specific "
                "skills, projects, or experience so the interview feels personal and realistic."
            )

        system = (
            "You are a professional technical interviewer conducting a real interview. "
            "Output exactly one question per line. No numbering. No preamble. No extra text. "
            f"Instruction: {instruction}"
        )

        user = (
            f"Generate exactly {request.count} unique interview questions for a "
            f"{request.level}-level {request.role}."
            f"{resume_context}"
        )

        raw       = _chat(system, user, temperature=0.65)
        questions = [q.strip() for q in raw.split('\n') if q.strip()]

        return QuestionResponse(
            questions=questions[:request.count],
            model_used=GROQ_MODEL_NAME,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Transcribe Audio ──────────────────────────────────────────────────────

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        audio_bytes   = await file.read()
        audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            temp_path = tmp.name
            audio_segment.export(temp_path, format="mp3")

        with open(temp_path, "rb") as f:
            transcription = groq_client.audio.transcriptions.create(
                model=GROQ_WHISPER_MODEL,
                file=f,
                response_format="text",
            )

        os.remove(temp_path)
        return {"transcription": transcription.strip()}

    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Real-time Follow-up Decision ─────────────────────────────────────────

@app.post("/realtime-followup", response_model=RealtimeFollowupResponse)
async def realtime_followup(request: RealtimeFollowupRequest):
    """
    Called after EVERY candidate answer in real time.
    The AI decides whether to:
      - Drill deeper / ask a follow-up                → action: "followup"
      - Ask the candidate to re-explain / teach it    → action: "followup" + instruction
      - Move to the next planned question             → action: "next"
      - End the interview                             → action: "end"
    """
    try:
        history_text = "\n".join(
            f"Q: {h['question']}\nA: {h['answer']}"
            for h in request.question_history[-6:]
        )

        system = (
            "You are a sharp, adaptive technical interviewer. "
            "Given the candidate's latest answer decide the best next move.\n"
            "Respond ONLY with a JSON object with these exact keys:\n"
            "  'action'        : one of 'followup' | 'next' | 'end'\n"
            "  'next_question' : the exact question to ask next (null if action='end')\n"
            "  'instruction'   : an optional interviewer directive to show the candidate "
            "when their answer is vague or shallow "
            "(e.g. 'Could you walk me through that step by step?' or "
            "'Pretend you are teaching this to a junior developer — explain it in depth.' or "
            "'Can you re-summarize that more clearly?'). Set to null if answer was good.\n"
            "  'reason'        : one sentence explaining your choice.\n\n"
            "Decision rules:\n"
            "- Shallow / vague answer          → action='followup', add an instruction to go deeper.\n"
            "- Strong, complete answer         → action='next'.\n"
            "- 8 or more questions asked       → action='end'.\n"
            "- Never repeat a question already asked.\n"
            "- Keep all questions relevant to the candidate resume and role."
        )

        user = (
            f"Role: {request.role} | Level: {request.level}\n"
            f"Resume context: {request.resume_summary}\n\n"
            f"Conversation so far:\n{history_text}\n\n"
            f"Latest question ({request.question_type}): {request.last_question}\n"
            f"Latest answer: {request.last_answer}\n"
            + (f"Code submitted:\n{request.user_code}" if request.user_code else "")
        )

        raw  = _chat(system, user, temperature=0.3, json_mode=True)
        data = _safe_json(raw)

        return RealtimeFollowupResponse(
            action        = data.get("action", "next"),
            next_question = data.get("next_question"),
            instruction   = data.get("instruction"),
            reason        = data.get("reason", ""),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Evaluate Single Answer ────────────────────────────────────────────────

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(request: EvaluationRequest):
    """
    Full evaluation: technical accuracy, confidence, English quality,
    clarity, with actionable suggestions and English-specific feedback.
    """
    try:
        if request.question_type == "oral":
            assessment = (
                "This is a conceptual oral question. Evaluate verbal explanation quality. "
                "CRITICAL: Empty, nonsense, or irrelevant answers → score 0 across the board."
            )
        else:
            assessment = (
                "This is a coding challenge. Evaluate code logic and efficiency. "
                "Use transcription for thought-process insight only. "
                "CRITICAL: Empty, random, or placeholder code → score 0 across the board."
            )

        resume_ctx = (
            f"Candidate resume context: {request.resume_summary}\n"
            if request.resume_summary else ""
        )

        system = (
            "You are a strict expert technical interviewer AND language coach. "
            "Do NOT hallucinate positive reviews for bad input.\n"
            f"Assessment context: {assessment}\n"
            f"{resume_ctx}"
            "Respond ONLY with a valid JSON object with these exact keys:\n"
            "  technicalScore  : int 0-100  (depth, accuracy, completeness of answer)\n"
            "  confidenceScore : int 0-100  (tone, decisiveness, absence of filler words)\n"
            "  englishScore    : int 0-100  (grammar, vocabulary, sentence structure)\n"
            "  clarityScore    : int 0-100  (logical flow, ease of understanding)\n"
            "  aiFeedback      : string     (3-4 sentence overall feedback paragraph)\n"
            "  idealAnswer     : string     (perfect answer in clean Markdown)\n"
            "  suggestions     : array of exactly 4 short strings (specific improvements the candidate should make)\n"
            "  englishFeedback : string     (2-3 sentences on grammar, vocabulary, fluency tips)\n"
        )

        user = (
            f"Role: {request.role} | Level: {request.level}\n"
            f"Question: {request.question}\n"
            f"Verbal Answer: {request.user_answer or 'No verbal answer provided'}\n"
            f"Code Answer: {request.user_code or 'No code provided'}\n"
        )

        raw  = _chat(system, user, temperature=0.1, json_mode=True)
        data = _safe_json(raw)

        if not data:
            return EvaluationResponse(
                technicalScore=0, confidenceScore=0,
                englishScore=0, clarityScore=0,
                aiFeedback="Failed to parse AI response — please try again.",
                idealAnswer="N/A",
                suggestions=["Could not evaluate — please try again."],
                englishFeedback="N/A",
            )

        # Sanitise types
        if not isinstance(data.get("idealAnswer"), str):
            data["idealAnswer"] = json.dumps(data.get("idealAnswer", ""))
        if not isinstance(data.get("suggestions"), list):
            data["suggestions"] = [str(data.get("suggestions", ""))]
        if not isinstance(data.get("englishFeedback"), str):
            data["englishFeedback"] = ""

        return EvaluationResponse(
            technicalScore  = int(data.get("technicalScore",  0)),
            confidenceScore = int(data.get("confidenceScore", 0)),
            englishScore    = int(data.get("englishScore",    0)),
            clarityScore    = int(data.get("clarityScore",    0)),
            aiFeedback      = data.get("aiFeedback",      ""),
            idealAnswer     = data.get("idealAnswer",     ""),
            suggestions     = data.get("suggestions",     []),
            englishFeedback = data.get("englishFeedback", ""),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 6. Full Session Report ───────────────────────────────────────────────────

@app.post("/session-report", response_model=FullInterviewReport)
async def session_report(request: SessionReportRequest):
    """
    Call once at the END of the interview with all per-question evaluations.
    Returns a holistic hiring report.
    """
    try:
        evals = request.evaluations
        if not evals:
            raise HTTPException(status_code=400, detail="No evaluations provided.")

        def avg(key: str) -> int:
            return round(sum(getattr(e, key) for e in evals) / len(evals))

        tech_avg  = avg("technicalScore")
        conf_avg  = avg("confidenceScore")
        eng_avg   = avg("englishScore")
        clar_avg  = avg("clarityScore")
        overall   = round(tech_avg * 0.40 + conf_avg * 0.20 +
                          eng_avg  * 0.20 + clar_avg * 0.20)

        all_feedback = "\n".join(
            f"Q{i+1}: {e.aiFeedback}" for i, e in enumerate(evals)
        )

        system = (
            "You are a senior hiring manager writing a final interview debrief. "
            "Respond ONLY with a JSON object with these exact keys:\n"
            "  'strengths'            : array of exactly 3 strings\n"
            "  'weaknesses'           : array of exactly 3 strings\n"
            "  'suggestions'          : array of exactly 4 actionable improvement strings\n"
            "  'hiringRecommendation' : one of 'Strong Yes' | 'Yes' | 'Maybe' | 'No'\n"
            "  'detailedFeedback'     : string (4-6 sentences holistic summary)\n"
        )

        user = (
            f"Role: {request.role} | Level: {request.level}\n"
            f"Scores — Technical: {tech_avg}, Confidence: {conf_avg}, "
            f"English: {eng_avg}, Clarity: {clar_avg}, Overall: {overall}\n\n"
            f"Per-question AI feedback:\n{all_feedback}"
        )

        raw  = _chat(system, user, temperature=0.3, json_mode=True)
        data = _safe_json(raw)

        return FullInterviewReport(
            overallScore         = overall,
            technicalAvg         = tech_avg,
            confidenceAvg        = conf_avg,
            englishAvg           = eng_avg,
            clarityAvg           = clar_avg,
            strengths            = data.get("strengths",            ["Good effort"]),
            weaknesses           = data.get("weaknesses",           ["Needs improvement"]),
            suggestions          = data.get("suggestions",          ["Practice more"]),
            hiringRecommendation = data.get("hiringRecommendation", "Maybe"),
            detailedFeedback     = data.get("detailedFeedback",     ""),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. Text-to-Speech (AI Interviewer Voice) ────────────────────────────────

class SpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = None          # override default voice if needed
    emotion: Optional[Literal[
        "neutral", "cheerful", "serious", "empathetic"
    ]] = "neutral"


@app.post("/speak")
async def speak(request: SpeakRequest):
    """
    Convert interviewer text → audio (WAV).
    The frontend plays this audio so the AI interviewer literally speaks
    every question, instruction, and follow-up aloud.

    Emotion tags supported by Orpheus:
      [cheerful]  [laughs]  [sighs]  [whisper]  [excited]  [sad]

    Returns: audio/wav stream — play directly in <audio> or via Web Audio API.
    """
    try:
        # Map our simple emotion → Orpheus vocal direction tag
        emotion_map = {
            "neutral":    "",
            "cheerful":   "[cheerful] ",
            "serious":    "",
            "empathetic": "[sighs] ",
        }
        prefix = emotion_map.get(request.emotion or "neutral", "")
        voice  = request.voice or GROQ_TTS_VOICE

        response = groq_client.audio.speech.create(
            model=GROQ_TTS_MODEL,
            voice=voice,
            input=f"{prefix}{request.text}",
            response_format="wav",
        )

        audio_bytes = response.read()

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=interviewer.wav"},
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/voices")
async def list_voices():
    """Returns available TTS voices the frontend can let the user pick from."""
    return {
        "voices": [
            {"id": "tara",    "gender": "female", "style": "warm, professional"},
            {"id": "leah",    "gender": "female", "style": "clear, neutral"},
            {"id": "jessica", "gender": "female", "style": "friendly, conversational"},
            {"id": "mia",     "gender": "female", "style": "calm, soft"},
            {"id": "zoe",     "gender": "female", "style": "energetic, upbeat"},
            {"id": "leo",     "gender": "male",   "style": "confident, deep"},
            {"id": "dan",     "gender": "male",   "style": "casual, clear"},
            {"id": "zac",     "gender": "male",   "style": "formal, professional"},
        ],
        "default": GROQ_TTS_VOICE,
    }


# ─────────────────────────── Entry Point ────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=AI_SERVICE_PORT)
