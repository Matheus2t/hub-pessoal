import os
from pydantic_settings import BaseSettings,SettingsConfigDict
from pydantic import SecretStr
class Settings(BaseSettings):
    model_config=SettingsConfigDict(env_file='.env')
    database_url: str|None=None
    api_cors_origins: str='http://localhost:3000'
    public_history_enabled: bool=True
    brapi_api_key: SecretStr|None=None
    market_data_public_enabled: bool=False
    sportsdb_api_key: SecretStr|None=None
    football_data_api_key: SecretStr|None=None
    balldontlie_api_key: SecretStr|None=None
    def model_post_init(self, __context):
        if os.getenv('VERCEL') == '1' and 'PUBLIC_HISTORY_ENABLED' not in os.environ:
            self.public_history_enabled = False
settings=Settings()
