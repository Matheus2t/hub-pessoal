from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str='mysql+pymysql://hub:hub@localhost:3306/hub_pessoal'
    api_cors_origins: str='http://localhost:3000'
    class Config: env_file='.env'
settings=Settings()
