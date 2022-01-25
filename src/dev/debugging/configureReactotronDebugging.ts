import Reactotron from "reactotron-react-native";
import { mst } from "reactotron-mst";
import { Account, accountStore } from "../stores/account";
import { AddressBookModel, addressBookStore } from "../stores/addressBook";
import { types } from "mobx-state-tree";

export const configureReactotronDebugging = () => {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const connectedReactotron = Reactotron.useReactNative({
    asyncStorage: { ignore: ["secret"] },
  })
    .use(mst())
    .configure()
    .connect();

  if (connectedReactotron.trackMstNode) {
    const AppStore = types
      .model("AppStore", {
        account: types.optional(Account, {}),

        addressBook: types.optional(AddressBookModel, {}),
      })
      .actions((self) => ({
        setAccountStore: (account: typeof accountStore) => {
          // @ts-expect-error: ts clear type without mobx special properties not the same
          self.account = account;
        },

        setAddressBook: (addressBook: typeof addressBookStore) => {
          self.addressBook = addressBook;
        },
      }));

    const app = AppStore.create();

    connectedReactotron.trackMstNode(app);
    app.setAccountStore(accountStore);
    app.setAddressBook(addressBookStore);
  }

  class ConsoleTron {
    public static log(message: string, ...args: unknown[]) {
      Reactotron.display({
        name: "LOG",
        preview: message,
        value: { message, args },
      });
    }
    public static warn(message: string, ...args: unknown[]) {
      Reactotron.display({
        name: "WARN",
        preview: message,
        value: { message, args },
        important: true,
      });
    }
    public static error(message: string, ...args: unknown[]) {
      Reactotron.display({
        name: "ERROR",
        preview: message,
        value: { message, args },
        important: true,
      });
    }
  }

  const consoleToReactotron = () => {
    if (process.env.REACT_APP_LOG_LEVEL !== "reactotron") return;
    console.error = ConsoleTron.error;
    console.warn = ConsoleTron.warn;
    console.log = ConsoleTron.log;
    return;
  };

  consoleToReactotron();
};
