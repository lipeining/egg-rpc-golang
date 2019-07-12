package main
import (
 "fmt"
 "log"
 "net/rpc"
 "./rpc_objects"
)
const serverAddress = "localhost"
func main() {
 client, err := rpc.DialHTTP("tcp", serverAddress + ":1234")
 if err != nil {
 log.Fatal("Error dialing:", err)
 }
 // Synchronous call
 args := &rpc_objects.Args{7, 8}
 var reply int
 err = client.Call("Args.Multiply", args, &reply)
 if err != nil {
 log.Fatal("Args error:", err)
 }
 fmt.Printf("Args: %d * %d = %d", args.N, args.M, reply)
 // Asynchronous call
quotient := new(rpc_objects.Quotient)
divCall := client.Go("Args.Divide", args, quotient, nil)
replyCall := <-divCall.Done	// will be equal to divCall
// check errors, print, etc.
fmt.Printf("replyCall: %v, quotient: %v", replyCall, quotient)
}