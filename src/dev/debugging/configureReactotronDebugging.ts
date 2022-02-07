import Reactotron from "reactotron-react-native";
import { mst } from "reactotron-mst";
import { accountStore } from "../stores/account";
import { IAnyType, IStateTreeNode } from "mobx-state-tree";

export const configureReactotronDebugging = ({ port = 9090 }: { port?: number }) => {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const connectedReactotron = Reactotron.useReactNative({
    asyncStorage: { ignore: ["secret"] },
  })
    .use(mst())
    .configure({ port })
    .connect();

  if (connectedReactotron.trackMstNode) {


    connectedReactotron.trackMstNode(accountStore as IStateTreeNode<IAnyType>);
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
