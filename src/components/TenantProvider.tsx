import { ReactNode, useEffect, useState } from "react";
import { useQuery } from "react-query";
import { getTenantInfo, TENANT } from "../utils/constants";
import Loader from "./Loader";
import { apiPublic } from "../api/baseApi";
import { useTheme } from "../context/themeContext";
import { Organization } from "../types/myTypes";
import { client } from "@client";

interface TenantResponse {
  message: string;
  orgId: string;
  organization: Organization;
}

export default function TenantGate({ children }: { children: ReactNode }) {
  const [hasInfoChanged, setHasInfoChanged] = useState(false);
  
  const { isLoading, data, error } = useQuery<TenantResponse>({
    queryFn: async () => {
        const response = await apiPublic.get(`/org/${TENANT}`);
        return response.data;
    },
    refetchOnWindowFocus: true, 
  });

  useEffect(() => {
    if (data) {
      const storedTenantInfo = localStorage.getItem('tenant-info');
      
      if (!storedTenantInfo) {
        // First time - store the data
        localStorage.setItem('tenant-info', JSON.stringify(data));
        setHasInfoChanged(false);
      } else {
        // Compare stored data with new data
        const parsedStoredInfo: TenantResponse = JSON.parse(storedTenantInfo);
        
        // Check if critical tenant info has changed
        const hasChanged = 
          parsedStoredInfo.orgId !== data.orgId ;

        // Always keep the copy current: the logo and name are read from it, so refreshing it
        // only on a change of orgId left returning members with an old logo for ever.
        // It is picked up on their next page load; only a different tenant forces a reload.
        localStorage.setItem('tenant-info', JSON.stringify(data));

        if (hasChanged) {
          setHasInfoChanged(true);
          
          // Optional: Reload page to apply changes
          console.log('Tenant information has changed. Reloading...');
          window.location.reload();
        }
      }
    }
  }, [data]);


  const { setTheme } = useTheme();

  useEffect(() => {
    // A client pack's colours are part of its build, not something the tenant record overrides.
    if (client.palette) {
      setTheme(client.palette[700], client.secondary ?? client.palette[500]);
    } else if (data?.organization.colorTheme) {
      setTheme(data.organization.colorTheme.primary, data.organization.colorTheme.secondary);
    }
  }, [data]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Invalid organization url</p>
          <p className="text-sm text-gray-600 mt-2">Please check the url and try again</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return <>{children}</>;
}