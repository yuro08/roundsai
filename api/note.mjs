import handler from '../server/cloud-api.mjs';
export default {fetch(request){return handler.fetch(new Request(new URL('/api/note',request.url),request))}};
