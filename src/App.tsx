/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  createSignal,
  type Component,
  For,
  createEffect,
  onCleanup,
  Show,
  createMemo,
} from "solid-js";
import { BsX } from "solid-icons/bs";
import { FiExternalLink, FiGithub } from "solid-icons/fi";
import { FaSolidDice } from "solid-icons/fa";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

interface SearchAbortController {
  abortController?: AbortController;
  timeout?: any;
}

const demoSearchQueries = [
  "baggy t-shirt",
  "blue leggings",
  "compression shorts",
  "men's socks",
];

const defaultSearchQuery = demoSearchQueries[0];

type SearchType = "semantic" | "hybrid" | "fulltext";

const App: Component = () => {
  const apiUrl = import.meta.env.VITE_API_URL as string;
  const datasetId = import.meta.env.VITE_DATASET_ID as string;
  const apiKey = import.meta.env.VITE_API_KEY as string;

  const [searchQuery, setSearchQuery] = createSignal(defaultSearchQuery);
  const [resultGroups, setResultGroups] = createSignal<any>();
  // eslint-disable-next-line solid/reactivity
  const [fetching, setFetching] = createSignal(true);
  const [searchType, setSearchType] = createSignal<SearchType>("hybrid");
  const [starCount, setStarCount] = createSignal(513);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [sex, setSex] = createSignal("");

  const searchCompanies = async (
    curSex: string,
    curPage: number,
    abortController: AbortController,
  ) => {
    setFetching(true);
    const response = await fetch(
      `${apiUrl}/chunk_group/group_oriented_search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "TR-Dataset": datasetId,
          Authorization: apiKey,
        },
        body: JSON.stringify({
          page: curPage,
          query: searchQuery(),
          search_type: searchType(),
          highlight_results: false,
          get_collisions: false,
          group_size: 1,
          page_size: 12,
          filters:
            curSex == ""
              ? undefined
              : {
                  must: [
                    {
                      field: "tag_set",
                      match: [curSex],
                    },
                  ],
                  must_not: [
                    {
                      field: "tag_set",
                      match: [curSex === "m" ? "f" : "m"],
                    },
                  ],
                },
        }),
        signal: abortController.signal,
      },
    );

    const data = await response.json();
    const groupChunks = data.group_chunks;

    if (curPage > 1) {
      setResultGroups((prevGroups) => {
        // filter out duplicates
        const newGroups = groupChunks.filter(
          (newGroup: any) =>
            !prevGroups.some(
              (prevGroup: any) => prevGroup.group_id === newGroup.group_id,
            ),
        );
        return prevGroups.concat(newGroups);
      });
    } else {
      setResultGroups(groupChunks);
    }
    setFetching(false);
  };

  // create a debounced version of the search function
  createEffect(
    (prevController: SearchAbortController | undefined) => {
      const curSearchQuery = searchQuery();
      if (!curSearchQuery) return;

      sex();
      searchType();
      currentPage();

      clearTimeout(prevController?.timeout ?? 0);
      prevController?.abortController?.abort();

      const newController = new AbortController();

      const timeout = setTimeout(
        () => void searchCompanies(sex(), currentPage(), newController),
        20,
      );

      onCleanup(() => clearTimeout(timeout));

      return { abortController: newController, timeout };
    },
    { abortController: undefined, timeout: undefined },
  );

  createEffect(() => {
    void fetch("https://api.github.com/repos/devflowinc/trieve").then(
      (response) => {
        if (response.ok) {
          void response.json().then((data) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            setStarCount(data.stargazers_count);
          });
        }
      },
    );
  });

  createEffect((prevSearchQuery) => {
    const curSearchQuery = searchQuery();
    if (prevSearchQuery === curSearchQuery) return curSearchQuery;
    setCurrentPage(0);
  }, defaultSearchQuery);

  createEffect((prevSearchType) => {
    const curSearchType = searchType();
    if (prevSearchType === curSearchType) return curSearchType;
    setCurrentPage(0);
  }, "hybrid");

  createEffect((prevSex) => {
    const curSexTag = sex();
    if (prevSex === curSexTag) return curSexTag;
    setCurrentPage(0);
  }, "");

  // infinite scroll effect to check if the user has scrolled to the bottom of the page and increment the page number to fetch more results
  createEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 1000 >
        document.documentElement.offsetHeight
      ) {
        if (fetching()) return;
        setFetching(true);

        setCurrentPage((prevPage) => prevPage + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    onCleanup(() => window.removeEventListener("scroll", handleScroll));
  });

  const tryOnAlgoliaUrl = createMemo(() => {
    const query = encodeURIComponent(searchQuery());
    const ret = `https://www.gymshark.com/search?q=${query}`;
    return ret;
  });

  return (
    <main class="min-h-screen bg-white px-[13px]">
      <div class="border-b pb-6 pt-6 sm:pr-[13px] lg:pb-9 lg:pt-9">
        <div class="prose prose-sm sm:prose-base flex max-w-full flex-col space-y-5">
          <span class="flex items-center space-x-2">
            <img
              class="h-16 w-16"
              src="https://cdn.trieve.ai/trieve-logo.png"
            />
            <h1 class="text-3xl">Trieve Search for Gymshark</h1>
          </span>
          <p class="pl-2">
            <a
              href="https://github.com/devflowinc/trieve"
              class="text-[#268bd2] underline"
            >
              Trieve
            </a>{" "}
            offers a new way to build search. Compare to{" "}
            <a href="https://www.algolia.com/" class="text-[#268bd2] underline">
              Algolia
            </a>{" "}
            on the official gymshark website search at{" "}
            <a href="https://www.gymshark.com" class="text-[#268bd2] underline">
              gymshark.com
            </a>
            .
          </p>
        </div>
      </div>
      <section class="relative isolate z-0 border-b pb-6 pt-6 sm:pr-[13px] lg:pb-9 lg:pt-9">
        <div class="flex flex-wrap justify-end gap-x-3 gap-y-2">
          <div class="flex items-center space-x-2 text-base">
            <label class="whitespace-nowrap">Search Type</label>
            <select
              id="location"
              name="location"
              class="block w-fit min-w-[130px] rounded-md border border-neutral-300 bg-white px-3 py-2"
              onChange={(e) =>
                setSearchType(e.currentTarget.value.toLowerCase() as SearchType)
              }
            >
              <option selected>Hybrid</option>
              <option>Semantic</option>
              <option>Fulltext</option>
            </select>
          </div>
          <div class="flex items-center space-x-2 text-base">
            <label class="whitespace-nowrap">Gender</label>
            <select
              id="gender"
              name="gender"
              class="block w-fit min-w-[130px] rounded-md border border-neutral-300 bg-white px-3 py-2"
              onChange={(e) => {
                const newSex = e.currentTarget.value.toLowerCase();
                const newVal = newSex === "all" ? "" : newSex.charAt(0);
                setSex(newVal);
              }}
            >
              <option selected>All</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
        </div>
        <div class="mb-6 mt-2 w-full rounded-md border border-neutral-300 bg-gray-100/10 p-5">
          <input
            class="w-full rounded-md border border-neutral-300 bg-white p-[10px]"
            placeholder="Search..."
            autofocus
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            value={searchQuery()}
          />
          <div class="flex flex-wrap items-center gap-x-2">
            <Show when={searchQuery()}>
              <div class="mt-2 flex w-fit items-center space-x-2 rounded-full border px-3 py-1">
                <p class="text-sm">{searchQuery()}</p>
                <button
                  aria-label="clear search query"
                  onClick={() => setSearchQuery("")}
                >
                  <BsX class="h-3 w-3" />
                </button>
              </div>
            </Show>
            <Show when={searchQuery()}>
              <a
                class="mt-2 flex w-fit items-center space-x-2 rounded-full border px-3 py-1"
                href={tryOnAlgoliaUrl()}
                target="_blank"
                aria-label="try search with Algolia"
              >
                <p class="text-sm">Try With Algolia</p>
                <FiExternalLink
                  class="h-3 w-3"
                  onClick={() => setSearchQuery("")}
                />
              </a>
            </Show>
            <button
              class="mt-2 flex w-fit items-center space-x-2 rounded-full border px-3 py-1"
              onClick={() =>
                setSearchQuery((prevQuery) => {
                  let randomQuery = prevQuery;
                  while (randomQuery === prevQuery) {
                    randomQuery =
                      demoSearchQueries[
                        Math.floor(Math.random() * demoSearchQueries.length)
                      ];
                  }
                  return randomQuery;
                })
              }
            >
              <p class="text-sm">Random Search</p>
              <FaSolidDice class="h-3 w-3" />
            </button>
            <a
              class="mt-2 flex w-fit items-center space-x-2 rounded-full border px-3 py-1"
              href="https://github.com/devflowinc/trieve"
              target="_blank"
              aria-label="trieve github"
            >
              <p class="text-sm">Star Trieve | {starCount()}</p>
              <FiGithub class="h-3 w-3" onClick={() => setSearchQuery("")} />
            </a>
          </div>
        </div>
        <p
          classList={{
            "text-sm font-extralight text-[#6E6E6E]": true,
            "animate-pulse": fetching(),
          }}
        >
          Showing {fetching() ? "..." : resultGroups()?.length ?? 0} items
        </p>
        <div
          classList={{
            "mt-2 overflow-hidden rounded-md grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5":
              true,
            "border border-neutral-300": resultGroups()?.length ?? 0 > 0,
          }}
        >
          <For each={resultGroups()}>
            {(group) => {
              return (
                <a
                  classList={{
                    "p-1 flex flex-col bg-gray-100/10 hover:bg-neutral-100/50":
                      true,
                  }}
                  href={`${group.metadata[0].metadata[0].link}`}
                  target="_blank"
                >
                  <div class="relative">
                    <img
                      class="block bg-gray-100 object-contain"
                      src={
                        group.metadata[0].metadata[0].metadata.featuredMedia
                          .src ||
                        "https://cdn.iconscout.com/icon/free/png-256/free-404-error-1-529717.png?f=webp"
                      }
                    />
                    <span class="text-red absolute bottom-2 left-2 rounded-md p-1">
                      {group.metadata[0].score.toFixed(4)}
                    </span>
                  </div>
                  <p class="mt-2 text-[14px]">
                    {group.metadata[0].metadata[0].metadata.title}
                  </p>
                  <p class="text-[14px] text-[#6E6E6E]">
                    {/* capitalize both words */}
                    <For
                      each={group.metadata[0].metadata[0].metadata.fit?.split(
                        " ",
                      )}
                    >
                      {(word: string) =>
                        word.charAt(0).toUpperCase() + word.slice(1) + " "
                      }
                    </For>
                  </p>
                  <p class="text-[14px] text-[#6E6E6E]">
                    {group.metadata[0].metadata[0].metadata.colour}
                  </p>
                  <p class="text-[14px] font-bold text-[#BF2E35]">
                    {formatCurrency(
                      group.metadata[0].metadata[0].metadata.price,
                    )}
                  </p>
                </a>
              );
            }}
          </For>
        </div>
      </section>
    </main>
  );
};

export default App;
