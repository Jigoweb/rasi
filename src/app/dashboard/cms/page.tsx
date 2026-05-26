import { redirect } from 'next/navigation';

export default function CmsIndex() {
  redirect('/dashboard/cms/pages');
}