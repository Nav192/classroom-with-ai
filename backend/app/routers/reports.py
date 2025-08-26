import io

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..dependencies import get_supabase


router = APIRouter()


@router.get("/results.csv")
def export_results_csv():
	sb = get_supabase()
	try:
		data = sb.table("results").select("*").execute().data
		df = pd.DataFrame(data or [])
		buf = io.StringIO()
		df.to_csv(buf, index=False)
		buf.seek(0)
		return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=results.csv"})
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=400, detail=str(exc))


