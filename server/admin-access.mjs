export const OWNER_ID='ff0c5409-e6a2-489b-bbfd-ea2b99a9e35a';
export const isOwner=u=>u?.id===OWNER_ID&&u.email?.toLowerCase()==='ludwingr@yahoo.com';
export const isAdmin=u=>isOwner(u)||u?.app_metadata?.roundsai_admin===true;
