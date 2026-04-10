import { createClient } from '@/shared/lib/supabase-server';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import Link from 'next/link';
import { Edit, Plus, Trash2 } from 'lucide-react';

export default async function CmsNewsPage() {
  const supabase = supabaseServer;

  const { data: news, error } = await supabase
    .from('bandi_news')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <div>Errore nel caricamento delle news: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bandi e News</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Comunicazione
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Data Pubblicazione</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {news && news.length > 0 ? (
              news.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'active' ? "default" : "secondary"}>
                      {item.status === 'active' ? 'Attivo' : 'Concluso'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.published_at ? new Date(item.published_at).toLocaleDateString('it-IT') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nessuna news trovata.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}