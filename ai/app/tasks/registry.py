TASKS = {
    "STUDENT_LEARNING_ANALYSIS": {
        "input_schema": "student-learning-analysis.input.schema.json",
        "output_schema": "student-learning-analysis.output.schema.json",
        "prompt_version": "stu-learning-analysis-v1",
        "instruction": (
            "Summarize strengths, improvement areas, and priority topics using only supplied assessments and progress."
        ),
    },
    "STUDENT_STUDY_PLAN_GENERATION": {
        "input_schema": "student-study-plan-generation.input.schema.json",
        "output_schema": "student-study-plan-generation.output.schema.json",
        "prompt_version": "stu-study-plan-v1",
        "instruction": (
            "Propose a study plan using only supplied topics, goals, availability, and dates. "
            "Use only supplied topic IDs."
        ),
    },
    "STUDENT_STUDY_PLAN_ADJUSTMENT": {
        "input_schema": "student-study-plan-adjustment.input.schema.json",
        "output_schema": "student-study-plan-adjustment.output.schema.json",
        "prompt_version": "stu-study-adjust-v1",
        "instruction": "Propose changes only to supplied TODO task IDs and mutable fields.",
    },
    "TEACHER_CLASS_ANALYSIS": {
        "input_schema": "teacher-class-analysis.input.schema.json",
        "output_schema": "teacher-class-analysis.output.schema.json",
        "prompt_version": "tea-class-analysis-v1",
        "instruction": (
            "Summarize the supplied class indicators and recommend support using only supplied IDs "
            "and backend classifications."
        ),
    },
    "ADMIN_FEEDBACK_GROUPING_STAGE1": {
        "input_schema": "admin-feedback-grouping-stage1.input.schema.json",
        "output_schema": "admin-feedback-grouping-stage1.output.schema.json",
        "prompt_version": "adm-feedback-group-v1",
        "instruction": "Group supplied feedback into issue candidates and reference only supplied feedback IDs.",
    },
    "ADMIN_FEEDBACK_SUMMARY_STAGE2": {
        "input_schema": "admin-feedback-summary-stage2.input.schema.json",
        "output_schema": "admin-feedback-summary-stage2.output.schema.json",
        "prompt_version": "adm-feedback-summary-v1",
        "instruction": "Summarize the supplied validated issue groups and identify their priorities.",
    },
}
