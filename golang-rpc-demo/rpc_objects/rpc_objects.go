package rpc_objects
import ("errors")
type Args struct {
 N, M int
}
type Quotient struct {
	Quo, Rem int
}
func (t *Args) Multiply(args *Args, reply *int) error {
 *reply = args.N * args.M
 return nil
}
func (t *Args) Divide(args *Args, quo *Quotient) error {
	if args.M == 0 {
		return errors.New("divide by zero")
	}
	quo.Quo = args.N / args.M
	quo.Rem = args.N % args.M
	return nil
}
