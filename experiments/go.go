func max(num1, num2 int) int {
	/* local variable declaration */
	result int
 
	if (num1 > num2) {
	   result = num1
	} else {
	   result = num2
	}
	return result 
 }

 func main() {
	/* local variable definition */
	var a_dsada int = 100
	var b int = 200
	var ret int
 
	/* calling a function to get max value */
	ret = max(a, b)
 
	fmt.Printf( "Max value is : %d\n", ret )
 }