import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

import { memberLogin } from "../../api/auth/auth-api";
import { useAppContext } from "../../context/authContext";
import AuthSplitLayout from "../../components/auth/AuthSplitLayout";
import { Button, IconInput } from "../../components/ui";
import Toast from "../../components/toast/Toast";
import { takeIntendedPath } from "../../utils/session";
import { HOME_ROUTE } from "../../components/auth/guards";
import { getTenantInfo } from "../../utils/constants";

export type LoginFormFields = {
  /** An email address or a membership ID. */
  identifier: string;
  password: string;
};

/** `login screen members/member's login page.png`. */
const LoginPage = () => {
  const { notifyUser } = Toast();
  const navigate = useNavigate();
  const location = useLocation();
  const { setRel8LoginUserData } = useAppContext();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormFields>();

  const { mutate, isLoading } = useMutation(memberLogin, {
    onSuccess: data => {
      setRel8LoginUserData({ ...data.member, token: data.token });
      notifyUser("Login Successful", "success");
      // Honour where they were headed before the session expired, if anywhere. Router
      // state covers an in-app bounce, sessionStorage the full page load the 401
      // interceptor performs. `replace` keeps the login screen out of the back stack —
      // otherwise "back" from the dashboard landed on a login form for a live session.
      const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from;
      const intended = takeIntendedPath() ?? (from ? from.pathname + (from.search ?? "") : null);
      navigate(intended ?? HOME_ROUTE, { replace: true });
    },
    onError: (error: any) => {
      notifyUser(error?.response?.data?.message || "An error occured while logging you in", "error");
    },
  });

  // The portal is one association's subdomain, so it names that association. Without it a
  // person who belongs to several (same email, or same membership ID) gets the API's
  // "choose an organization" answer, which this screen has no way to offer.
  const onSubmit = (data: LoginFormFields) =>
    mutate({ userType: "member", email: data.identifier.trim(), password: data.password, orgId: getTenantInfo().orgId ?? undefined });

  return (
    <AuthSplitLayout title="Login" subtitle="Input details to access alumnus account">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <IconInput
          iconStyle="attached"
          icon={FiUser}
          type="text"
          placeholder="Email Address or Membership ID"
          autoComplete="username"
          autoCapitalize="none"
          error={errors.identifier?.message}
          {...register("identifier", {
            required: "Email address or membership ID is required",
            // Only hold an email-shaped entry to the email pattern; anything else is a membership ID.
            validate: value => !value.includes("@") || /\S+@\S+\.\S+/.test(value.trim()) || "Enter a valid email address",
          })}
        />

        <IconInput
          iconStyle="attached"
          icon={FiLock}
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password", { required: "Password is required" })}
          // The eye toggle rides inside the field, as the mockup draws it.
          trailing={
            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="text-muted hover:text-org-primary px-3">
              {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          }
        />

        <div className="flex items-center justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-hairline accent-[rgb(var(--color-org-primary))]" />
            Remember me
          </label>

          <Link to="/forgot-password" className="text-sm text-ink hover:text-org-primary">
            Forget Password?
          </Link>
        </div>

        <Button htmlType="submit" fullWidth size="lg" isLoading={isLoading} className="mt-2">
          Login
        </Button>
      </form>
    </AuthSplitLayout>
  );
};

export default LoginPage;
