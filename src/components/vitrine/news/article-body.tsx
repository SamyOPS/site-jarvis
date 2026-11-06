import Image from "next/image";
import { Fragment, type ReactNode } from "react";

import type { NewsBlock, NewsInline } from "@/features/vitrine/news-content";

/*
  Rendu d'un article : chaque bloc devient un element React. Aucun HTML venu de la base
  n'est interprete (voir news-content.ts).

  Listes et citations reprennent le vocabulaire de la fiche d'offre d'emploi : filets fins,
  tiret noir en guise de puce, serif italique pour ce qui est cite.
*/

const BULLET_ROW = "flex items-start gap-4 border-b border-zinc-900/25 py-3";
const BULLET_MARK = "mt-3.5 h-px w-3 shrink-0 bg-zinc-900";

function renderInline(nodes: NewsInline[], keyPrefix = ""): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}${index}`;
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.text}</Fragment>;
      case "strong":
        return (
          <strong key={key} className="font-semibold text-zinc-900">
            {renderInline(node.children, `${key}-`)}
          </strong>
        );
      case "em":
        return <em key={key}>{renderInline(node.children, `${key}-`)}</em>;
      case "link": {
        const external = /^https?:/i.test(node.href);
        return (
          <a
            key={key}
            href={node.href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="break-words font-medium text-zinc-900 underline decoration-zinc-900/30 underline-offset-4 transition-colors hover:decoration-zinc-900"
          >
            {renderInline(node.children, `${key}-`)}
          </a>
        );
      }
    }
  });
}

/** Lignes d'un paragraphe ou d'une citation, separees d'un saut de ligne. */
function renderLines(lines: NewsInline[][]) {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {renderInline(line, `${index}-`)}
    </Fragment>
  ));
}

export function ArticleBody({ blocks }: { blocks: NewsBlock[] }) {
  return (
    <div className="space-y-6 text-lg leading-relaxed text-zinc-600">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2
                key={index}
                className="pt-8 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl"
              >
                {renderInline(block.children)}
              </h2>
            ) : (
              <h3 key={index} className="pt-4 text-xl font-semibold tracking-tight text-zinc-900">
                {renderInline(block.children)}
              </h3>
            );
          case "paragraph":
            return <p key={index}>{renderLines(block.lines)}</p>;
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={index} className="border-t border-zinc-900/25">
                {block.items.map((item, position) => (
                  <li key={position} className={BULLET_ROW}>
                    {block.ordered ? (
                      <span
                        aria-hidden
                        className="w-6 shrink-0 font-quote text-xl leading-relaxed text-zinc-900"
                      >
                        {position + 1}.
                      </span>
                    ) : (
                      <span aria-hidden className={BULLET_MARK} />
                    )}
                    <span className="min-w-0">{renderInline(item)}</span>
                  </li>
                ))}
              </List>
            );
          }
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-zinc-900 py-1 pl-6 font-quote text-2xl italic leading-snug text-zinc-900 sm:text-3xl"
              >
                {renderLines(block.lines)}
              </blockquote>
            );
          case "image":
            return (
              <figure key={index} className="py-4">
                {/*
                  Dimensions inconnues : 1600x900 ne sert qu'a reserver la place et a choisir
                  les variantes ; `h-auto` rend son vrai rapport a l'image une fois chargee.
                */}
                <Image
                  src={block.src}
                  alt={block.alt}
                  width={1600}
                  height={900}
                  sizes="(min-width: 768px) 768px, 100vw"
                  unoptimized={!block.src.startsWith("/")}
                  className="h-auto w-full bg-zinc-100"
                />
                {block.alt ? (
                  <figcaption aria-hidden className="mt-3 text-sm text-zinc-500">
                    {block.alt}
                  </figcaption>
                ) : null}
              </figure>
            );
          case "rule":
            return <hr key={index} className="my-10 border-zinc-900/25" />;
        }
      })}
    </div>
  );
}
