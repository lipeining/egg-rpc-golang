package main
import (
 "net/http"
 "log"
 "net"
 "net/rpc"
 "time"
 "./rpc_objects"
)
func main() {
 calc := new(rpc_objects.Args)
 rpc.Register(calc)
 rpc.HandleHTTP()
 listener, e := net.Listen("tcp", "localhost:1234")
 if e != nil {
 log.Fatal("Starting RPC-server -listen error:", e)
 }
 go http.Serve(listener, nil)
 time.Sleep(1000e9)
}
/* Output:
Starting Process E:/Go/GoBoek/code_examples/chapter_14/rpc_server.exe ...
** after 5 s: **
End Process exit status 0
*/