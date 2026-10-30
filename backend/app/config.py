import os
from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str='mysql+pymysql://hub:hub@localhost:3306/hub_pessoal'
    api_cors_origins: str='http://localhost:3000'
    public_history_enabled: bool=True
    class Config: env_file='.env'
    def model_post_init(self, __context):
        if os.getenv('VERCEL') == '1' and 'PUBLIC_HISTORY_ENABLED' not in os.environ:
            self.public_history_enabled = False
settings=Settings()
