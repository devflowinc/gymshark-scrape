const API_URL = Bun.env.API_URL;
const API_KEY = Bun.env.API_KEY;
const DATASET_ID = Bun.env.DATASET_ID;

const createChunkGroup = async (name, description, tracking_id) => {
  // console.log("CREATING CHUNK GROUP", name, description, tracking_id);
  // return;

  const response = await fetch(`${API_URL}/chunk_group`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
      "TR-Dataset": DATASET_ID,
    },
    body: JSON.stringify({
      name,
      description,
      tracking_id,
    }),
  });

  const responseJson = await response.json();
  if (!response.ok) {
    console.error("error creating chunk_group", responseJson.message);
    return "";
  }
  console.log("success creating chunk_group", responseJson.id);

  const id = responseJson.id;
  return id;
};

const createChunk = async (
  chunk_html,
  group_tracking_ids,
  link,
  tag_set,
  tracking_id,
  metadata
) => {
  // console.log("CREATING CHUNK", chunk_html, group_tracking_ids, link, tag_set, tracking_id, metadata);
  // return;

  const response = await fetch(`${API_URL}/chunk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: Bun.env.API_KEY ?? "",
      "TR-Dataset": Bun.env.DATASET_ID ?? "",
    },
    body: JSON.stringify({
      chunk_html,
      group_tracking_ids,
      link,
      tag_set,
      tracking_id,
      metadata,
    }),
  });
  if (!response.ok) {
    console.error("error queueing chunk", response.status, response.statusText);
    const respText = await response.text();
    console.error("error queueing chunk", respText);
    return "";
  }

  const responseJson = await response.json();
  if (!response.ok) {
    console.error("error queueing chunk", responseJson.message);
    return "";
  }
  console.log(
    "success queueing chunk to be created",
    responseJson.chunk_metadata.id
  );
  const chunkId = responseJson.chunk_metadata.id;

  return chunkId;
};

const getAllProducts = async (page) => {
  const resp = await fetch(
    `https://www.gymshark.com/_next/data/8oarcF-f0GtE1JR6wOT7j/en-US/collections/all-products.json?page=${page}`,
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Chromium";v="122", "Not(A:Brand";v="24", "Brave";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "x-nextjs-data": "1",
      },
      referrer:
        "https://www.gymshark.com/collections/all-products?collections=bottoms",
      referrerPolicy: "same-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    }
  );

  const data = await resp.json();
  const products = data.pageProps.prefetch.hits;
  for (let product of products) {
    getSingleProduct(product.handle);
  }
};

const getSingleProduct = async (handle) => {
  const resp = await fetch(
    `https://www.gymshark.com/_next/data/8oarcF-f0GtE1JR6wOT7j/en-US/products/${handle}.json`,
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Chromium";v="122", "Not(A:Brand";v="24", "Brave";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "x-nextjs-data": "1",
      },
      referrer:
        "https://www.gymshark.com/products/gymshark-crest-joggers-light-grey-marl-aw22",
      referrerPolicy: "same-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    }
  );

  const data = await resp.json();
  const productData = data.pageProps.productData.product;

  const sku = productData.sku;

  const collections = productData.collections;
  const gender = productData.gender;
  const type = productData.type;

  const fit = productData.fit;

  const description = productData.description;
  const title = productData.title;

  const media = productData.media;
  const price = productData.price;

  let group_tag_set = collections;
  group_tag_set.push(...gender);
  group_tag_set.push(type);
  group_tag_set.push(fit);

  let group_metadata = {
    media: media,
    price: price,
    title: title,
    fit: fit,
    group_handle: handle,
  };

  const word_style = () => {
    if (gender.includes("m") && gender.includes("f")) {
      return "for unisex men and women";
    } else if (gender.includes("m")) {
      return "for men";
    } else if (gender.includes("f")) {
      return "for women";
    }

    return "";
  };

  const _ = await createChunkGroup(title, "Gymshark product", sku);

  const variants = data.pageProps.productData.variants;
  for (let variant of variants) {
    const colour = variant.colour;
    const featuredMedia = variant.featuredMedia;
    const objectID = variant.objectID;
    const variant_handle = variant.handle;

    const chunk_html =
      `<h1>${title} in ${colour} with ${fit} style ${word_style()}\n\n</h1>` +
      description;
    const group_tracking_ids = [sku];
    const link = `https://www.gymshark.com/products/${variant_handle}`;
    const chunk_tag_set = [...group_tag_set, colour];
    const chunk_tracking_id = variant.handle;
    const chunk_metadata = {
      ...group_metadata,
      colour: colour,
      featuredMedia: featuredMedia,
      objectID: objectID,
    };

    const chunkId = await createChunk(
      chunk_html,
      group_tracking_ids,
      link,
      chunk_tag_set,
      chunk_tracking_id,
      chunk_metadata
    );
  }
};

// there are 16 pages of products
for (let i = 0; i < 17; i++) {
  getAllProducts(i);
}
