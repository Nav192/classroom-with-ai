CREATE OR REPLACE FUNCTION get_visible_quizzes_for_student(class_id_param UUID, student_id_param UUID)
RETURNS SETOF quizzes AS $$
BEGIN
  RETURN QUERY
    SELECT q.*
    FROM quizzes AS q
    WHERE q.class_id = class_id_param
      AND q.is_archived = FALSE
      AND (
        -- Condition 1: The quiz is public (has no specific visibility rules)
        NOT EXISTS (
          SELECT 1
          FROM quiz_visibility v_check
          WHERE v_check.quiz_id = q.id
        )
        -- Condition 2: The student is explicitly in the visibility list
        OR EXISTS (
          SELECT 1
          FROM quiz_visibility v_user
          WHERE v_user.quiz_id = q.id
            AND v_user.user_id = student_id_param
        )
      )
    ORDER BY q.created_at DESC;
END;
$$ LANGUAGE plpgsql;
