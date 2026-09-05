export interface OwnProfileDto {
  id: string;
  name?: string;
  email: string;
  avatarUrl: string;
}

export interface UpdateOwnProfileBody {
  name?: string;
  email?: string;
}

export type UpdateOwnProfileResponse = OwnProfileDto;

export interface SendMyPasswordLinkResponse {
  sentTo: string;
}
