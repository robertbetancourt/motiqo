import { redirect } from 'next/navigation';
import Home from '@/components/home';
export default async function Page({searchParams}:{searchParams:Promise<{element?:string;saved?:string}>}){
  const params=await searchParams;
  if(params.element||params.saved){const query=new URLSearchParams();if(params.element)query.set('element',params.element);if(params.saved)query.set('saved',params.saved);redirect(`/library?${query}`);}
  return <Home/>;
}
