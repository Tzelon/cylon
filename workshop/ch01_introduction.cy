
# Compilation
# ===========
# In `.cy` files we write code in Cylon syntax which we then compile to javascript.
# Run the following command in a terminal
# ```
# $ npm run build TODO: maybe we have CLI tool?
# ```
# 
# If finished successfully, all `.cy` files in the project have been compiled and 
# the output files are located next to them in the directory. 
# 
# Now look in the `ch01_introduction.js` file created. The following line was 
# compiled into `console.log("Hello, World!")
# 
print("Hello, World!!");

# Run the following command in a separate terminal window:
# ```
# $ npm run start TODO: maybe we have CLI tool?
# ```
# This will watch your files and re-build when saving.
# NOTE: turn on `autosave` in VS Code for this to work smoothly, or remember to
# save in order to trigger a build


# Fomatting
# =========
# Cylon has a powerful formatting tool which was the inspiration for PrettierJS.
# The `cylon-vscode` extension uses it out of the box when you format the file.
# Just press `Option + Shift + F` and see the differnce.
# Use it!
print(
  "Hello again!"
  
);