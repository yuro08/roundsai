import handler from '../server/cloud-api.mjs';
export default {fetch(request){const url=new URL(request.url);url.pathname='/api/assist';return handler.fetch(new Request(url,request))}};
