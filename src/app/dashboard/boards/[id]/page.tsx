import { BoardView } from "@/components/board-view";

export const metadata = {
  title: "Tableau",
};

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardView boardId={id} />;
}
