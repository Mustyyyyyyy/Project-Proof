CREATE INDEX "Project_search_vector_idx"
ON "Project"
USING GIN (
  to_tsvector(
    'simple',
    coalesce("title", '') || ' ' ||
    coalesce("shortDescription", '') || ' ' ||
    coalesce("detailedDescription", '')
  )
);
