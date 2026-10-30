import BpmiLogo from "../assets/cover-images/bpmi-logo.jpg";
import anniLogo from "../assets/cover-images/aanilogo.png";
import nimnLogo from "../assets/cover-images/nimnlogoo.svg";
import bukaalogo from "../assets/cover-images/bukaalogo.png";

import { getSubdomain } from "./extra_functions";
import { apiPublic } from "../api/baseApi";

export const ENDPOINT_URL = "https://rel8back.alumsapp.com";
// export const ENDPOINT_URL = "http://localhost:8080";
// export const ENDPOINT_URL = import.meta.env.VITE_ENDPOINT_URL ?? "http://localhost:8080";
export const TENANT = getSubdomain() || "aani";
export const WSS = `ws://rel8back.alumsapp.com/ws/chat/${TENANT}/`;
export const sitename = "rel8back.alumsapp.com";

export const getTenantInfo = () => {
  const data = JSON.parse(localStorage.getItem("tenant-info") || "null");

  return {
    orgId: (data?.orgId as string | undefined) || null,
    organization: data?.organization || null,
    logo: data?.organization?.logo || null,
  };
};

// export const  getTenantInfo = ()=>{
//     const currentTenant = TENANT
//     const currentLogo:any = {
//         'bpmi':BpmiLogo,
//         'aani':anniLogo,
//         'nimn':nimnLogo,
//         'bukaa':bukaalogo,
//     }

//     return {
//         logo:currentLogo[currentTenant]
//     }
// }
