import { apiPublic } from "../baseApi";

/**
 * Removed: `verifyUserMembership` and `createMember`.
 *
 * They posted to `/auth/ManageMemberValidation/` and
 * `/auth/ManageMemberValidation/create_member/` — Django-era paths this backend does not
 * mount — and they implemented a self-registration flow that **does not exist**. Members
 * are created by an admin (or by an approved application); they receive an email, set a
 * password and log in. There is nothing to register for.
 *
 * The two screens that drove it, `VerifyMemberPage` and `RegistrationPage`, are gone with
 * them.
 */

/*
 * Removed: `resetPassword`.
 *
 * `POST /members/reset-password/:token` exists on the backend but nothing here called it.
 * The portal sets passwords through `setPassword` (`POST /members/set-password`), which is
 * where the forgot-password email now points and which also marks the member verified —
 * `reset-password` does neither. One path, not two.
 */

export const setPassword =async (data: {password: string, token: string}) =>{
    const response = await apiPublic.post(`/members/set-password`,data);
    return response.data
}


// `email` may also be a membership ID — the API decides which by looking for an "@".
export const memberLogin = async (data: {email: string, userType: string, password: string, orgId?: string}) =>{
    const response = await apiPublic.post(`/members/login`, data);
    return response.data
}

export const requestPassword = async(data:{email:string})=>{
    const response = await apiPublic.post('/members/forgot-password',data)
    return response.data
}

export const getAllChapters = async () =>{
    const response = await apiPublic.get(`/user/chapters`);
    // console.log(response.data)
    return response.data
}