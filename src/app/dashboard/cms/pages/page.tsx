import { supabaseServer } from '@/shared/lib/supabase-server';
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

export default async function CmsPagesPage() {
  const supabase = supabaseServer;

  const { data: pages, error } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <div>Errore nel caricamento delle pagine: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Elenco Pagine</h2>
        <Link href="/dashboard/cms/pages/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Pagina
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Categoria / Slug</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages && pages.length > 0 ? (
              pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    /{page.category}/{page.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{page.template_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={page.is_published ? "default" : "secondary"}>
                      {page.is_published ? "Pubblicata" : "Bozza"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/cms/pages/${page.id}`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
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
                  Nessuna pagina trovata. Clicca su "Nuova Pagina" per iniziare.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}