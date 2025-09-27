CREATE TABLE quiz_weights (
    id SERIAL PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    mcq_weight INTEGER NOT NULL DEFAULT 0,
    true_false_weight INTEGER NOT NULL DEFAULT 0,
    essay_weight INTEGER NOT NULL DEFAULT 0,
    UNIQUE(class_id)
);