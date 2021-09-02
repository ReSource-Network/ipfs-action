const pinataSDK = require("@pinata/sdk");
const fsPath = require("path");

let pinataOptions = {
  pinataOptions: {
    cidVersion: 0,
    wrapWithDirectory: false,
  },
};

module.exports = {
  name: "Pinata",
  builder: async (options) => {
    const { pinataKey, pinataSecret } = options;

    if (!pinataKey) {
      throw new Error("PinataKey is empty");
    }

    if (!pinataSecret) {
      throw new Error("PinataSecret is empty");
    }

    return pinataSDK(pinataKey, pinataSecret);
  },
  upload: async (api, options) => {
    const { path, pinataPinName, verbose } = options;

    let source = path;
    if (!fsPath.isAbsolute(source)) {
      const dir = (process.env.GITHUB_WORKSPACE || process.cwd()).toString();
      source = fsPath.join(dir, source);
    }

    if (pinataPinName) {
      pinataOptions = {
        ...pinataOptions,
        pinataMetadata: {
          name: pinataPinName,
        },
      };
    }

    const newHash = api.pinFromFS(source, pinataOptions).then((result) => {
      return result.IpfsHash;
    });

    function unpinHash(hashToUnpin) {
      api
        .unpin(hashToUnpin)
        .then((result) => {
          if (verbose) {
            console.log(result);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }

    const metadataFilter = {
      name: pinataPinName,
    };
    const filters = {
      status: "pinned",
      pageLimit: 1000,
      pageOffset: 0,
      metadata: metadataFilter,
    };
    api
      .pinList(filters)
      .then((result) => {
        if (verbose) {
          console.log(result);
        }
        result.rows.forEach((element) => {
          if (element.ipfs_pin_hash != newHash) {
            unpinHash(element.ipfs_pin_hash);
          }
        });
      })
      .catch((err) => {
        console.log(err);
      });

    return;
  },
};
