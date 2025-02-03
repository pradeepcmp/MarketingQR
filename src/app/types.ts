export interface Option {
    value: string;
    label: string;
    concern?: string;
  }
  
  export interface FormData {
    userType: string;
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
  export interface CombinedData {
    userRoles: Option[];
    concerns: Option[];
    divisions: Option[];
    branches: Option[];
    portalNames: Option[];
    screens: Option[];
  }