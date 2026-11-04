FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /service
COPY deploy/call/requirements.txt /service/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home call
COPY backend/app/call*.py /service/backend/app/
COPY scripts/start_2t_call.py /service/start_2t_call.py
USER 10001
EXPOSE 10000
CMD ["python", "start_2t_call.py"]
