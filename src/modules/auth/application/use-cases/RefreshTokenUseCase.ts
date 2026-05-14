import { TokenService } from "@/modules/auth/application/ports/TokenService";

export interface RefreshTokenResponse {
  accessToken: string;
}

export class RefreshTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  execute(refreshToken: string): RefreshTokenResponse {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const accessToken = this.tokenService.generateAccessToken(payload);
    return { accessToken };
  }
}
