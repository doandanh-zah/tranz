export class Api {
 constructor(readonly token:string){}
 async call<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
  const response=await fetch(`http://127.0.0.1:4318/api${path}`,{method,headers:{Authorization:`Bearer ${this.token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(35000)]):AbortSignal.timeout(35000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error??'Request failed.');return data as T;
 }
}
