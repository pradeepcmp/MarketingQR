export interface Option {
  value: string;
  label: string;
  branches?: Option[];
  portals?: Option[];
  screens?: Option[];
  concern?: string;
}

export interface FormData {
  userCode: string;
  concern: string;
  division: string;
  branch: string;
  otp: string;
}

export interface LocationData {
  locationName: string;
  ip: string;
}

interface Branch {
  value: string;
  label: string;
}

export interface CombinedData {
  user: {
    code: string;
    role: string;
  };
  userRoles: Array<Option>;
  concerns: Array<Option>;
  divisions: Array<Option>;
  divisionBranches: Record<string, {
    value: string;
    label: string;
    concern: string;
    branches: Branch[];
  }>;
}
