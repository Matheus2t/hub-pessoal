import os
from pydantic_settings import BaseSettings,SettingsConfigDict
from pydantic import Field,SecretStr
class Settings(BaseSettings):
    model_config=SettingsConfigDict(env_file='.env')
    database_url: str|None=None
    api_cors_origins: str='http://localhost:3000'
    public_history_enabled: bool=True
    utilities_enabled: bool=False
    link_resolver_enabled: bool=False
    background_remover_enabled: bool=False
    link_resolver_max_redirects: int=Field(default=8,ge=0,le=8)
    link_resolver_total_timeout_seconds: float=Field(default=12.0,gt=0,le=12.0)
    link_resolver_connect_timeout_seconds: float=Field(default=3.0,gt=0,le=3.0)
    link_resolver_read_timeout_seconds: float=Field(default=3.0,gt=0,le=3.0)
    brapi_api_key: SecretStr|None=None
    market_data_public_enabled: bool=False
    sportsdb_api_key: SecretStr|None=None
    football_data_api_key: SecretStr|None=None
    balldontlie_api_key: SecretStr|None=None
    def model_post_init(self, __context):
        if os.getenv('VERCEL') == '1' and 'PUBLIC_HISTORY_ENABLED' not in os.environ:
            self.public_history_enabled = False
settings=Settings()
