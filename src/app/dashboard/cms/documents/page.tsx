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
import { Edit, Plus, Trash2, FileIcon } from 'lucide-react';

export default async function CmsDocumentsPage() {
  const supabase = supabaseServer;

  const { data: documents, error } = await supabase
    .from('documents')
    .select('*, pages(title)')
    .order('created_at', { ascending: false });

  if (error) {
    return <div>Errore nel caricamento dei documenti: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Documenti e Modulistica</h2>
        <Link href="/dashboard/cms/documents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Documento
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Pagina Collegata</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents && documents.length > 0 ? (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-blue-500" />
                    {doc.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {/* @ts-ignore */}
                    {doc.pages ? doc.pages.title : '-'}
                  </TableCell>
                  <TableCell>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm">
                      Apri file
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/cms/documents/${doc.id}`}>
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
                  Nessun documento trovato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}