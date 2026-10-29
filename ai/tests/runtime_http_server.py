import sys

import uvicorn
from ai.runtime.app import create_app
from ai.runtime.model import GenerationResult


class ScriptedWorker:
    model_id = "test-model"
    prompt_versions = {
        "STUDENT_LEARNING_ANALYSIS": "prompt-STUDENT_LEARNING_ANALYSIS",
        "STUDENT_STUDY_PLAN_GENERATION": "prompt-STUDENT_STUDY_PLAN_GENERATION",
        "STUDENT_STUDY_PLAN_ADJUSTMENT": "prompt-STUDENT_STUDY_PLAN_ADJUSTMENT",
        "TEACHER_CLASS_ANALYSIS": "prompt-TEACHER_CLASS_ANALYSIS",
        "ADMIN_FEEDBACK_GROUPING_STAGE1": "prompt-ADMIN_FEEDBACK_GROUPING_STAGE1",
        "ADMIN_FEEDBACK_SUMMARY_STAGE2": "prompt-ADMIN_FEEDBACK_SUMMARY_STAGE2",
    }

    def start(self):
        pass

    def close(self):
        pass

    def infer(self, _request):
        return GenerationResult(sys.argv[2], 0, "eos")


app = create_app(lambda _config: ScriptedWorker(), {"AI_RUNTIME_TOKEN": "test-runtime-token"})
uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]), log_level="critical", access_log=False)
