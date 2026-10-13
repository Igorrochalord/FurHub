from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "dev-insecure-change-me-dev-insecure-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "sqlite:///./furconhub.db"
    secret_key: str = DEV_SECRET
    access_token_minutes: int = 720
    cors_origins: str = ""  # comma separated; empty = same-origin only
    seed_demo: bool = False
    geocoder_url: str = "https://nominatim.openstreetmap.org/search"
    geocoder_user_agent: str = "FurConHub/0.1 (self-hosted; configure GEOCODER_USER_AGENT)"
    frontend_shell_url: str = "http://frontend:8080/__shell.html"  # HTML base do SPA, usado para injetar SEO

    # Taxa do provedor de pagamento, calculada no backend sobre cada ingresso pago.
    payment_fee_percent: float = 3.99
    payment_fee_fixed_cents: int = 39

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def sqlalchemy_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and (s.secret_key == DEV_SECRET or len(s.secret_key) < 32):
        raise RuntimeError("SECRET_KEY must be set to a random value of 32+ chars in production")
    return s
